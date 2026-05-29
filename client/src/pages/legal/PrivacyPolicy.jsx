import { useEffect } from "react";
import { Link } from "react-router-dom";
import "./Legal.scss";

const LAST_UPDATED = "29 May 2025";
const CONTACT_EMAIL = "tobeatravellercompany@gmail.com";

const PrivacyPolicy = () => {
  useEffect(() => {
    document.title = "Privacy Policy — ToBeATraveller";
    window.scrollTo(0, 0);
    return () => { document.title = "ToBeATraveller"; };
  }, []);

  return (
    <div className="legal section__container">
      <div className="legal__header">
        <h1 className="legal__title">Privacy Policy</h1>
        <p className="legal__meta">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="legal__body">
        <Section title="1. Who we are">
          <p>
            ToBeATraveller ("we", "our", "us") is a travel itinerary sharing platform.
            We are the data controller for the personal data collected through this service.
            You can contact us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="2. What data we collect">
          <p>We collect the following categories of personal data:</p>
          <ul>
            <li>
              <strong>Account data:</strong> email address, username, and password
              (stored as a secure hash — we never store your password in plain text).
            </li>
            <li>
              <strong>Profile data:</strong> display name, biography, location, profile
              photo, and "about" text that you optionally provide.
            </li>
            <li>
              <strong>Content you create:</strong> travel itineraries (title, destination,
              dates, places, budget, photos), comments, likes, and saved trips.
            </li>
            <li>
              <strong>Social data:</strong> who you follow and who follows you.
            </li>
            <li>
              <strong>Technical data:</strong> session tokens used to keep you logged in.
              We do not collect IP addresses, device fingerprints, or analytics data beyond
              what is strictly necessary to operate the service.
            </li>
          </ul>
        </Section>

        <Section title="3. How we use your data">
          <p>We use your personal data exclusively to:</p>
          <ul>
            <li>Create and manage your account.</li>
            <li>Display your public profile and itineraries to other users.</li>
            <li>Provide social features (following, comments, likes, saved trips).</li>
            <li>Send you account-related communications if necessary (e.g. account deletion confirmation).</li>
          </ul>
          <p>
            We do not use your data for advertising, profiling, or selling to third parties.
            We do not send marketing emails.
          </p>
          <p>
            The legal basis for processing is the performance of a contract (Art. 6(1)(b) GDPR)
            — i.e., providing the service you signed up for.
          </p>
        </Section>

        <Section title="4. Third-party services">
          <p>We use the following external services that may process your data:</p>
          <ul>
            <li>
              <strong>Cloudinary</strong> — used to store and serve profile photos and
              itinerary cover images. Images you upload are stored on Cloudinary's servers.
              See their <a href="https://cloudinary.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
            </li>
            <li>
              <strong>Geoapify</strong> — used to search for destinations and places of
              interest when creating an itinerary. Search queries (place names) are sent
              to their API. See their <a href="https://www.geoapify.com/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
            </li>
            <li>
              <strong>AI itinerary generation</strong> — when you use the "Generate with AI"
              feature, the destination, trip duration, and category are sent to an AI
              service to generate place suggestions. No personally identifiable information
              is included in these requests.
            </li>
          </ul>
        </Section>

        <Section title="5. Data retention">
          <p>
            We retain your personal data for as long as your account is active. If you
            delete your account, all your personal data (profile, itineraries, comments,
            and social connections) is permanently deleted from our systems. Cached or
            backed-up copies may persist for up to 30 days before being purged.
          </p>
        </Section>

        <Section title="6. Your rights (GDPR)">
          <p>If you are in the European Economic Area, you have the following rights:</p>
          <ul>
            <li><strong>Access:</strong> request a copy of the data we hold about you.</li>
            <li><strong>Rectification:</strong> correct inaccurate or incomplete data via your profile settings.</li>
            <li><strong>Erasure:</strong> delete your account and all associated data at any time from your profile settings.</li>
            <li><strong>Portability:</strong> request your data in a machine-readable format.</li>
            <li><strong>Restriction:</strong> ask us to limit how we process your data.</li>
            <li><strong>Objection:</strong> object to processing based on legitimate interests.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We will respond
            within 30 days.
          </p>
          <p>
            You also have the right to lodge a complaint with your national data protection
            authority (in Spain: <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">AEPD</a>).
          </p>
        </Section>

        <Section title="7. Cookies and session storage">
          <p>
            We use a single session cookie to keep you logged in. This cookie is
            strictly necessary for the service to function and does not require consent
            under ePrivacy rules. We do not use advertising cookies, tracking pixels, or
            analytics cookies.
          </p>
          <p>
            On mobile, authentication tokens are stored in the device's secure storage
            rather than cookies.
          </p>
        </Section>

        <Section title="8. Data security">
          <p>
            Passwords are hashed using a secure algorithm before being stored. All data
            is transmitted over HTTPS. We apply reasonable technical and organisational
            measures to protect your data, though no system is completely immune to risk.
          </p>
        </Section>

        <Section title="9. Children">
          <p>
            ToBeATraveller is not directed at children under 16. We do not knowingly
            collect data from minors. If you believe a minor has registered, please
            contact us so we can delete their account.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            We may update this policy from time to time. When we do, we will update
            the "Last updated" date at the top. Continued use of the service after
            changes constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            For any privacy-related questions or requests, contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </Section>
      </div>

      <div className="legal__footer">
        <Link to="/terms" className="legal__link">Terms of Service</Link>
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

export default PrivacyPolicy;
