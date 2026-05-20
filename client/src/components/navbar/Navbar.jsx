import { useEffect, useState } from "react";
import { GoBook, GoHome, GoPerson, GoSignIn, GoSignOut } from "react-icons/go";
import { IoAddOutline, IoEarth, IoSaveOutline, IoSearch } from "react-icons/io5";
import { RiUserCommunityLine } from "react-icons/ri";
import { useSelector } from "react-redux";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  selectAuthLoading,
  selectIsAuthenticated,
} from "../../store/auth/authSelectors";
import { selectMe } from "../../store/user/userInfoSelectors";
import { generateAvatar } from "../../utils/constants/constants";
import "./Navbar.scss";

const Navbar = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);
  const userMe = useSelector(selectMe);
  const [meOpen, setMeOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMeOpen(false);
  }, [location]);

  return (
    <>
      {/* Mobile: fixed top header */}
      <div className="mobile-header">
        <Link to="/" className="logo">
          <IoEarth className="logo__icon" />Tobeatraveller
        </Link>
      </div>

      {/* Desktop: fixed left sidebar */}
      <nav className="navbar">
        <div className="nav-section">
          <Link to="/" className="logo navbar__logo">
            <IoEarth className="logo__icon" />Tobeatraveller
          </Link>
          <h3>Discover</h3>
          <NavLink to="/" className="nav-item" end>
            <GoHome className="nav-icon" />
            <span>Home</span>
          </NavLink>
          <NavLink to="/explore" className="nav-item">
            <IoSearch className="nav-icon" />
            <span>Explore</span>
          </NavLink>
          <NavLink to="/community" className="nav-item">
            <RiUserCommunityLine className="nav-icon" />
            <span>Community</span>
          </NavLink>
        </div>

        {isAuthenticated && !authLoading && (
          <NavLink to="/create-itinerary" className="nav-create">
            <IoAddOutline className="nav-icon" />
            <span>Create trip</span>
          </NavLink>
        )}

        {authLoading ? (
          <div className="loading-placeholder nav-section">
            <h3>Your space</h3>
            <p><GoBook className="nav-icon" /><span>Loading...</span></p>
            <p><GoBook className="nav-icon" /><span>Loading...</span></p>
          </div>
        ) : (
          <div className="nav-section">
            <h3>Your Space</h3>
            {isAuthenticated ? (
              <>
                <NavLink to="/my-itineraries" className="nav-item">
                  <GoBook className="nav-icon" />
                  <span>My trips</span>
                </NavLink>
                <NavLink to="/itineraries/saved" className="nav-item">
                  <IoSaveOutline className="nav-icon" />
                  <span>Saved trips</span>
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/login" className="nav-item">
                  <GoSignIn className="nav-icon" />
                  <span>Login</span>
                </NavLink>
                <NavLink to="/register" className="nav-item">
                  <GoSignIn className="nav-icon" />
                  <span>Register</span>
                </NavLink>
              </>
            )}
          </div>
        )}

        {/* Desktop: user footer pinned at bottom */}
        {isAuthenticated && userMe && (
          <div className="nav-footer">
            <Link to={`/profile/${userMe.id}`} className="nav-footer__user">
              <img
                src={userMe.avatarUrl || generateAvatar(userMe.username)}
                alt={userMe.username}
                className="nav-footer__avatar"
              />
              <span className="nav-footer__username">@{userMe.username}</span>
            </Link>
            <NavLink to="/logout" className="nav-footer__logout" title="Logout">
              <GoSignOut />
            </NavLink>
          </div>
        )}
      </nav>

      {/* Mobile: Me panel (slide up) */}
      {meOpen && isAuthenticated && (
        <>
          <div className="me-panel__backdrop" onClick={() => setMeOpen(false)} />
          <nav className="me-panel">
            <NavLink to={`/profile/${userMe?.id}`} className="me-panel__item">
              <GoPerson className="me-panel__icon" />
              <span>Profile</span>
            </NavLink>
            <NavLink to="/my-itineraries" className="me-panel__item">
              <GoBook className="me-panel__icon" />
              <span>My trips</span>
            </NavLink>
            <NavLink to="/itineraries/saved" className="me-panel__item">
              <IoSaveOutline className="me-panel__icon" />
              <span>Saved trips</span>
            </NavLink>
            <div className="me-panel__divider" />
            <NavLink to="/logout" className="me-panel__item me-panel__item--danger">
              <GoSignOut className="me-panel__icon" />
              <span>Logout</span>
            </NavLink>
          </nav>
        </>
      )}

      {/* Mobile: fixed bottom tab bar */}
      <nav className="bottom-nav">
        <NavLink to="/" className="bottom-nav__item" end>
          <GoHome className="bottom-nav__icon" />
          <span>Home</span>
        </NavLink>
        <NavLink to="/explore" className="bottom-nav__item">
          <IoSearch className="bottom-nav__icon" />
          <span>Explore</span>
        </NavLink>
        {isAuthenticated && (
          <NavLink to="/create-itinerary" className="bottom-nav__item bottom-nav__item--create">
            <div className="bottom-nav__create-btn">
              <IoAddOutline className="bottom-nav__icon" />
            </div>
          </NavLink>
        )}
        <NavLink to="/community" className="bottom-nav__item">
          <RiUserCommunityLine className="bottom-nav__icon" />
          <span>Community</span>
        </NavLink>
        {isAuthenticated ? (
          <button
            className={`bottom-nav__item ${meOpen ? "active" : ""}`}
            onClick={() => setMeOpen(!meOpen)}
          >
            <GoPerson className="bottom-nav__icon" />
            <span>Me</span>
          </button>
        ) : (
          <NavLink to="/login" className="bottom-nav__item">
            <GoSignIn className="bottom-nav__icon" />
            <span>Login</span>
          </NavLink>
        )}
      </nav>
    </>
  );
};

export default Navbar;
