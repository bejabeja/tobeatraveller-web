import { IoEarthOutline } from "react-icons/io5";
import { Link } from "react-router-dom";
import "./Footer.scss";

const Footer = () => (
  <footer className="footer">
    <div className="footer__inner">
      <div className="footer__brand">
        <Link to="/" className="footer__logo">
          <IoEarthOutline aria-hidden="true" />
          <span>ToBeATraveller</span>
        </Link>
        <p className="footer__tagline">Discover journeys around the world.</p>
      </div>

      <nav className="footer__nav" aria-label="Footer navigation">
        <div className="footer__nav-group">
          <span className="footer__nav-label">Discover</span>
          <Link to="/explore">Explore trips</Link>
          <Link to="/community">Community</Link>
        </div>
        <div className="footer__nav-group">
          <span className="footer__nav-label">Legal</span>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
        </div>
        <div className="footer__nav-group">
          <span className="footer__nav-label">Contact</span>
          <Link to="/contact">Get in touch</Link>
        </div>
      </nav>
    </div>

    <div className="footer__bottom">
      <p>&copy; {new Date().getFullYear()} ToBeATraveller. All rights reserved.</p>
    </div>
  </footer>
);

export default Footer;
