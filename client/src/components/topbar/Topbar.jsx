import { useEffect, useState } from "react";
import { GoPerson, GoSignOut } from "react-icons/go";
import {
  IoCardOutline,
  IoChevronDownOutline,
  IoGiftOutline,
  IoListOutline,
  IoNotificationsOutline,
  IoSaveOutline,
  IoSearchOutline,
  IoSettingsOutline,
} from "react-icons/io5";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { selectUnreadCount } from "@tobeatraveller/shared";
import { selectMe, selectMeLoading } from "../../store/user/userInfoSelectors.js";
import { generateAvatar } from "../../utils/constants/constants";
import { optimizedCloudinaryUrl } from "../../utils/cloudinaryUrl.js";
import NotificationsPanel from "./NotificationsPanel";
import "./Topbar.scss";

// Desktop-only (>=480px, see Topbar.scss) counterpart to the mobile "Yo"
// panel: Notifications, Mi cuenta and Suscripcion used to be their own rows
// in the sidebar (Navbar.jsx), permanently on screen no matter the page,
// which duplicated whatever a routed page (e.g. Account.jsx) showed for the
// same links. Folding them here mirrors the sidebar's "Tus herramientas"
// section staying put (that's product nav, not account chrome). The search
// trigger moved here too (was its own row in the sidebar) since it's a
// global action, not a page destination.
const Topbar = ({ onOpenSearch }) => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const userMe = useSelector(selectMe);
  const userMeLoading = useSelector(selectMeLoading);
  const unreadCount = useSelector(selectUnreadCount);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!event.target.closest(".topbar__account")) setMenuOpen(false);
      if (!event.target.closest(".topbar__notif-wrap")) setNotifOpen(false);
    };
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, []);

  return (
    <section className="topbar">
      <button type="button" className="topbar__search-trigger" onClick={onOpenSearch}>
        <IoSearchOutline className="topbar__search-trigger-icon" />
        <span>{t("globalSearch.placeholder")}</span>
      </button>

      <div className="topbar__actions">
        <div className="topbar__notif-wrap">
          <button
            type="button"
            className="topbar__notif"
            aria-label={t("nav.notifications")}
            aria-expanded={notifOpen}
            onClick={() => setNotifOpen((open) => !open)}
          >
            <IoNotificationsOutline className="topbar__notif-icon" />
            {unreadCount > 0 && (
              <span className="nav-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
            )}
          </button>
          <NotificationsPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        <div className="topbar__account">
          {userMeLoading ? (
            <div className="topbar-skeleton">
              <div className="skeleton topbar-skeleton-avatar" />
              <div className="skeleton skeleton--text short" />
            </div>
          ) : (
            <button
              type="button"
              className="topbar__trigger"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
            >
              <img
                src={optimizedCloudinaryUrl(userMe?.avatarUrl, { width: 48 }) || generateAvatar(userMe?.username)}
                alt={userMe?.username ? `@${userMe.username}` : ""}
                className="topbar__avatar"
              />
              <span>{userMe?.username}</span>
              <IoChevronDownOutline className="topbar__trigger-chevron" aria-hidden="true" />
            </button>
          )}

          {/* Every destination direct in the dropdown (GitHub's "Your
              profile" / "Your repositories" / "Settings" pattern), instead
              of nesting most of them one level down behind a "Mi cuenta"
              item: that nested page would repeat "Profile" right after
              you'd already have clicked past it here. */}
          <div className={`topbar__menu${menuOpen ? " topbar__menu--open" : ""}`}>
            <Link to={`/profile/${userMe?.id}`} className="topbar__menu-item" onClick={() => setMenuOpen(false)}>
              <GoPerson className="topbar__menu-icon" />
              <span>{t("nav.profile")}</span>
            </Link>
            <Link to="/my-itineraries" className="topbar__menu-item" onClick={() => setMenuOpen(false)}>
              <IoListOutline className="topbar__menu-icon" />
              <span>{t("nav.myTrips")}</span>
            </Link>
            <Link to="/itineraries/saved" className="topbar__menu-item" onClick={() => setMenuOpen(false)}>
              <IoSaveOutline className="topbar__menu-icon" />
              <span>{t("nav.savedTrips")}</span>
            </Link>
            <Link to="/settings" className="topbar__menu-item" onClick={() => setMenuOpen(false)}>
              <IoSettingsOutline className="topbar__menu-icon" />
              <span>{t("settings.title")}</span>
            </Link>
            <div className="topbar__menu-divider" />
            <Link to="/subscription" className="topbar__menu-item" onClick={() => setMenuOpen(false)}>
              <IoCardOutline className="topbar__menu-icon" />
              <span>{t("nav.subscription")}</span>
            </Link>
            <Link to="/invite" className="topbar__menu-item" onClick={() => setMenuOpen(false)}>
              <IoGiftOutline className="topbar__menu-icon" />
              <span>{t("referral.accountCardTitle")}</span>
            </Link>
            <div className="topbar__menu-divider" />
            <Link to="/logout" className="topbar__menu-item topbar__menu-item--danger">
              <GoSignOut className="topbar__menu-icon" />
              <span>{t("auth.logout")}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Topbar;
