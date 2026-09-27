import { IoEarthOutline } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { REOPEN_COOKIE_PREFERENCES_EVENT } from "../../utils/analytics";
import "./Footer.scss";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Link to="/" className="footer__logo">
            <IoEarthOutline aria-hidden="true" />
            <span>ToBeATraveller</span>
          </Link>
          <p className="footer__tagline">{t("footer.tagline")}</p>
        </div>

        <nav className="footer__nav" aria-label={t("footer.navigation")}>
          <div className="footer__nav-group">
            <span className="footer__nav-label">{t("footer.discover")}</span>
            <Link to="/explore">{t("footer.exploreTrips")}</Link>
            <Link to="/community">{t("footer.community")}</Link>
            <Link to="/subscription">{t("footer.plans")}</Link>
          </div>
          <div className="footer__nav-group">
            <span className="footer__nav-label">{t("footer.legal")}</span>
            <Link to="/privacy-policy">{t("auth.privacyPolicy")}</Link>
            <Link to="/terms">{t("auth.termsOfService")}</Link>
            <button
              type="button"
              className="footer__cookie-preferences"
              onClick={() => window.dispatchEvent(new Event(REOPEN_COOKIE_PREFERENCES_EVENT))}
            >
              {t("footer.cookiePreferences")}
            </button>
          </div>
          <div className="footer__nav-group">
            <span className="footer__nav-label">{t("footer.contact")}</span>
            <Link to="/contact">{t("footer.getInTouch")}</Link>
          </div>
        </nav>
      </div>

      <div className="footer__bottom">
        <p>&copy; {new Date().getFullYear()} ToBeATraveller. {t("footer.rightsReserved")}</p>
      </div>
    </footer>
  );
};

export default Footer;
