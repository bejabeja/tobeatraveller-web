import { useEffect, useState } from "react";
import { GoHome, GoPerson, GoSignIn, GoSignOut } from "react-icons/go";
import {
  IoAddOutline,
  IoNotificationsOutline,
  IoChevronBack,
  IoChevronForward,
  IoSaveOutline,
  IoSearch,
} from "react-icons/io5";
import { RiUserCommunityLine } from "react-icons/ri";
import { useDispatch, useSelector } from "react-redux";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { refreshUnreadCount, selectUnreadCount } from "@tobeatraveller/shared";
import {
  selectIsAuthenticated,
} from "../../store/auth/authSelectors";
import { selectMe } from "../../store/user/userInfoSelectors";
import { generateAvatar } from "../../utils/constants/constants";
import "./Navbar.scss";

const Navbar = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const userMe = useSelector(selectMe);
  const unreadCount = useSelector(selectUnreadCount);
  const [meOpen, setMeOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(refreshUnreadCount());
    const interval = setInterval(() => dispatch(refreshUnreadCount()), 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, dispatch]);
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "true"
  );
  const location = useLocation();
  const isAuthRoute = ["/login", "/register"].includes(location.pathname);

  useEffect(() => {
    setMeOpen(false);
  }, [location]);

  useEffect(() => {
    document.documentElement.classList.toggle("sidebar-collapsed", isCollapsed);
    localStorage.setItem("sidebar-collapsed", isCollapsed);
  }, [isCollapsed]);

  return (
    <>
      {/* Mobile: fixed top header — hidden on auth pages */}
      {!isAuthRoute && (
        <div className="mobile-header">
          <Link to="/" className="logo">
            <img src="/logo.svg" alt="ToBeATraveller" className="logo__full" height="28" />
          </Link>
        </div>
      )}

      {/* Desktop: fixed left sidebar */}
      <nav className="navbar">
        <Link to="/" className="logo navbar__logo">
          <img src="/logo-mark.svg" alt="ToBeATraveller" className="logo__mark" width="26" height="26" />
          <img src="/logo.svg" alt="ToBeATraveller" className="logo__full" height="28" />
        </Link>

        <div className="nav-section">
          <h3>{t("nav.discover")}</h3>
          <NavLink to="/" className="nav-item" end title={t("nav.home")}>
            <GoHome className="nav-icon" />
            <span>{t("nav.home")}</span>
          </NavLink>
          <NavLink to="/explore" className="nav-item" title={t("nav.explore")}>
            <IoSearch className="nav-icon" />
            <span>{t("nav.explore")}</span>
          </NavLink>
          <NavLink to="/community" className="nav-item" title={t("nav.community")}>
            <RiUserCommunityLine className="nav-icon" />
            <span>{t("nav.community")}</span>
          </NavLink>
        </div>

        {isAuthenticated && (
          <NavLink to="/create-itinerary" className="nav-create" title={t("nav.createTrip")}>
            <IoAddOutline className="nav-icon" />
            <span>{t("nav.createTrip")}</span>
          </NavLink>
        )}

        {isAuthenticated && (
          <div className="nav-section">
            <h3>{t("nav.yourSpace")}</h3>
            <NavLink to="/notifications" className="nav-item nav-item--notif" title={t("nav.notifications")}>
              <span className="nav-item__icon-wrap">
                <IoNotificationsOutline className="nav-icon" />
                {unreadCount > 0 && (
                  <span className="nav-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                )}
              </span>
              <span>{t("nav.notifications")}</span>
            </NavLink>
            <NavLink to="/itineraries/saved" className="nav-item" title={t("nav.savedTrips")}>
              <IoSaveOutline className="nav-icon" />
              <span>{t("nav.savedTrips")}</span>
            </NavLink>
          </div>
        )}

        <div className="navbar__bottom">
          <button
            className="navbar__toggle"
            onClick={() => setIsCollapsed((v) => !v)}
            title={isCollapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
          >
            {isCollapsed ? (
              <IoChevronForward className="nav-icon" />
            ) : (
              <IoChevronBack className="nav-icon" />
            )}
            <span>{t("nav.collapse")}</span>
          </button>

          {!isAuthenticated && (
            <div className="nav-auth">
              <Link to="/register" className="btn btn--primary nav-auth__register">{t("nav.createAccountBtn")}</Link>
              <Link to="/login" className="nav-auth__login">{t("auth.alreadyMember")} <span>{t("auth.signInLink")}</span></Link>
            </div>
          )}

          {isAuthenticated && userMe && (
            <div className="nav-footer">
              <Link to={`/profile/${userMe.id}`} className="nav-footer__user" title={`@${userMe.username}`}>
                <img
                  src={userMe.avatarUrl || generateAvatar(userMe.username)}
                  alt={userMe.username}
                  className="nav-footer__avatar"
                />
                <span className="nav-footer__username">@{userMe.username}</span>
              </Link>
              <NavLink to="/logout" className="nav-footer__logout" title={t("auth.logout")}>
                <GoSignOut />
              </NavLink>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile: Me panel (slide up) */}
      {meOpen && isAuthenticated && (
        <>
          <div className="me-panel__backdrop" onClick={() => setMeOpen(false)} />
          <nav className="me-panel">
            <NavLink to={`/profile/${userMe?.id}`} className="me-panel__item">
              <GoPerson className="me-panel__icon" />
              <span>{t("nav.profile")}</span>
            </NavLink>
            <NavLink to="/itineraries/saved" className="me-panel__item">
              <IoSaveOutline className="me-panel__icon" />
              <span>{t("nav.savedTrips")}</span>
            </NavLink>
            <div className="me-panel__divider" />
            <NavLink to="/logout" className="me-panel__item me-panel__item--danger">
              <GoSignOut className="me-panel__icon" />
              <span>{t("auth.logout")}</span>
            </NavLink>
          </nav>
        </>
      )}

      {/* Mobile: fixed bottom tab bar */}
      <nav className="bottom-nav">
        <NavLink to="/" className="bottom-nav__item" end>
          <GoHome className="bottom-nav__icon" />
          <span>{t("nav.home")}</span>
        </NavLink>
        <NavLink to="/explore" className="bottom-nav__item">
          <IoSearch className="bottom-nav__icon" />
          <span>{t("nav.explore")}</span>
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
          <span>{t("nav.community")}</span>
        </NavLink>
        {isAuthenticated ? (
          <button
            className={`bottom-nav__item ${meOpen ? "active" : ""}`}
            onClick={() => setMeOpen(!meOpen)}
          >
            <GoPerson className="bottom-nav__icon" />
            <span>{t("nav.me")}</span>
          </button>
        ) : (
          <NavLink to="/login" className="bottom-nav__item">
            <GoSignIn className="bottom-nav__icon" />
            <span>{t("nav.login")}</span>
          </NavLink>
        )}
      </nav>
    </>
  );
};

export default Navbar;
