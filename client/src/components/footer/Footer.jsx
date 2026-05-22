import React from "react";
import { FaEnvelope, FaGithub, FaLinkedin } from "react-icons/fa";
import "./Footer.scss";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer__socials">
        <a
          href="https://github.com/bejabeja/tobeatraveller-web"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit our GitHub"
        >
          <FaGithub />
        </a>
        <a
          href="https://www.linkedin.com/in/miriamabella/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
        >
          <FaLinkedin />
        </a>
        <a href="mailto:tobeatravellercompany@gmail.com" aria-label="Email us">
          <FaEnvelope />
        </a>
      </div>
      <p className="footer__copyright">
        &copy; {new Date().getFullYear()} ToBeATraveller — Built with 💙 for
        travelers
      </p>
      {/* TODO */}
      {/* <div className="footer__terms">
        <a href="/terms-and-conditions">Terms and Conditions</a>
        <a href="/privacy-policy">Privacy Policy</a>
      </div> */}
    </footer>
  );
};

export default Footer;
