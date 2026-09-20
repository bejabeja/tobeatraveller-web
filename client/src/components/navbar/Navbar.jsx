import { useEffect, useState } from "react";
import { GoHome, GoSignIn } from "react-icons/go";
import {
  IoAddOutline,
  IoBookOutline,
  IoBriefcaseOutline,
  IoCardOutline,
  IoCartOutline,
  IoChevronBack,
  IoChevronDownOutline,
  IoChevronForward,
  IoChevronForward as IoChevronForwardOutline,
  IoCompassOutline,
  IoFlashOutline,
  IoJournalOutline,
  IoListOutline,
  IoNotificationsOutline,
  IoPeopleOutline,
  IoSearchOutline,
} from "react-icons/io5";
import { useSelector } from "react-redux";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { selectUnreadCount } from "@tobeatraveller/shared";
import { selectIsAuthenticated } from "../../store/auth/authSelectors";
import { selectMe } from "../../store/user/userInfoSelectors";
import { generateAvatar } from "../../utils/constants/constants";
import { optimizedCloudinaryUrl } from "../../utils/cloudinaryUrl";
import "./Navbar.scss";

// A dropdown (instead of a fixed ES/EN toggle) so adding a language later is
// just one more entry here, not a UI redesign.
const LANGUAGES = [
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "en", flag: "🇬🇧", label: "English" },
];

// The four tools the subscription page itself sells as the reason to go
// Premium (see PREMIUM_FEATURES in @tobeatraveller/shared); showing them here too
// (not just buried inside Mi cuenta) so a free user keeps seeing exactly
// what they're missing, badge and all, wherever they look for the nav.
// Van Log, Life Diary and Supplies are free to browse (capped at 10 entries/
// items each), so they're excluded from the "PREMIUM" badge below; Packing
// Checklist stays fully gated until/unless it gets its own cap.
const PREMIUM_TOOLS = [
  { to: "/van-log", Icon: IoBookOutline, labelKey: "nav.vanLog", premiumOnly: false },
  { to: "/supplies", Icon: IoCartOutline, labelKey: "nav.supplies", premiumOnly: false },
  { to: "/packing-checklist", Icon: IoBriefcaseOutline, labelKey: "nav.packingChecklist", iconClassName: "nav-icon--briefcase" },
  { to: "/life-diary", Icon: IoJournalOutline, labelKey: "nav.lifeDiary", premiumOnly: false },
];

// Self-contained (not lifted into Navbar's own state) so it can be mounted
// twice at once without cross-talk: once in the marketing top nav (desktop/
// tablet) and once in the mobile header (<480px, see .mobile-header__lang),
// which previously had no way to switch language at all.
const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const currentLanguage = LANGUAGES.find((lang) => i18n.language?.startsWith(lang.code)) ?? LANGUAGES[0];

  useEffect(() => setIsOpen(false), [location]);

  return (
    <div className="lang-switcher">
      <button
        type="button"
        className="lang-switcher__trigger"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t("settings.language")}
      >
        <span aria-hidden="true">{currentLanguage.flag}</span>
        <IoChevronDownOutline className="lang-switcher__chevron" aria-hidden="true" />
      </button>

      {isOpen && (
        <>
          <div className="lang-switcher__backdrop" onClick={() => setIsOpen(false)} />
          <ul className="lang-switcher__menu" role="listbox">
            {LANGUAGES.map((lang) => (
              <li key={lang.code}>
                <button
                  type="button"
                  className={`lang-switcher__option${lang.code === currentLanguage.code ? " lang-switcher__option--active" : ""}`}
                  role="option"
                  aria-selected={lang.code === currentLanguage.code}
                  onClick={() => { i18n.changeLanguage(lang.code); setIsOpen(false); }}
                >
                  <span aria-hidden="true">{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

// Below this, the sidebar auto-collapses to its icon-only rail (tablet-width
// viewports get a persistent-but-compact nav instead of the full 240px one,
// which felt like a phone-in-landscape/small-tablet got the desktop layout
// with zero adaptation); at or above it, full width is the default. Reuses
// the exact same ":root.sidebar-collapsed" CSS the manual toggle already
// drives (Navbar.scss), no new breakpoint needed there. Only applies until
// the user makes an explicit choice via the collapse toggle, which is then
// remembered regardless of width.
const SIDEBAR_AUTO_COLLAPSE_BELOW_WIDTH = 900;
const SIDEBAR_COLLAPSED_STORAGE_KEY = "sidebar-collapsed";

const Navbar = ({ onOpenSearch }) => {
  const { t } = useTranslation();
  const navigate   = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const userMe     = useSelector(selectMe);
  const unreadCount = useSelector(selectUnreadCount);
  const location   = useLocation();

  const [createOpen, setCreateOpen]     = useState(false);
  const [isCollapsed, setIsCollapsed]   = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    return stored !== null ? stored === "true" : window.innerWidth < SIDEBAR_AUTO_COLLAPSE_BELOW_WIDTH;
  });

  const isAuthRoute = ["/login", "/register"].includes(location.pathname);
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    setCreateOpen(false);
  }, [location]);

  // Home's hero photo runs full-bleed behind the marketing nav (see
  // .marketing-navbar--overlay); the nav starts transparent over it and
  // becomes a solid bar once the hero is scrolled past.
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);
  useEffect(() => {
    if (!isHomePage) return;
    const handleScroll = () => setIsScrolledPastHero(window.scrollY > 40);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]);
  const isTransparentNav = isHomePage && !isScrolledPastHero;

  // Anonymous visitors get the horizontal marketing nav (see the ternary
  // below), never the collapsible sidebar, so this class must not linger on
  // <html> from a previous logged-in session, or the marketing nav's
  // ".side-content" would inherit the collapsed sidebar's 64px width rule.
  useEffect(() => {
    if (!isAuthenticated) {
      document.documentElement.classList.remove("sidebar-collapsed");
      return;
    }
    document.documentElement.classList.toggle("sidebar-collapsed", isCollapsed);
  }, [isCollapsed, isAuthenticated]);

  // Keeps the tablet-width auto-collapse live as the window is resized, but
  // only until the user has clicked the toggle once: from then on
  // toggleSidebar() below is the only thing allowed to touch isCollapsed, so
  // an explicit preference is never silently overridden by a resize.
  useEffect(() => {
    const handleResize = () => {
      if (localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) !== null) return;
      setIsCollapsed(window.innerWidth < SIDEBAR_AUTO_COLLAPSE_BELOW_WIDTH);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((collapsed) => {
      const next = !collapsed;
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, next);
      return next;
    });
  };

  const openCreate = () => setCreateOpen(true);
  const handleCreate = (path) => { setCreateOpen(false); navigate(path); };

  return (
    <>
      {/* Mobile: fixed top header */}
      {!isAuthRoute && (
        <div className="mobile-header">
          {/* Was the bottom-nav's "+"; on Van Log/Supplies/Packing checklist/
              Life diary that row also shows the page's own "+ Add x" button,
              so the same icon in the same bar opened two unrelated things.
              Living up here instead of in the bottom-nav's icon row keeps it
              reachable without sitting next to that page-specific button. */}
          {isAuthenticated && (
            <button type="button" className="mobile-header__create" onClick={openCreate} aria-label={t("nav.createTrip")}>
              <IoAddOutline className="mobile-header__create-icon" />
            </button>
          )}
          <Link to="/" className="logo">
            <img src="/logo.svg" alt="ToBeATraveller" className="logo__full" height="28" />
          </Link>
          {/* Desktop gets notifications as a sidebar nav-item; the mobile
              bottom-nav has no room for a 6th icon, so it lives here instead,
              the only other persistent chrome on small screens. */}
          {isAuthenticated && (
            <Link to="/notifications" className="mobile-header__notif" aria-label={t("nav.notifications")}>
              <IoNotificationsOutline className="mobile-header__notif-icon" />
              {unreadCount > 0 && (
                <span className="nav-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
              )}
            </Link>
          )}
          {/* Anonymous visitors have no sidebar/marketing-nav on mobile web
              (both hidden below 480px), so without this the language switch
              added to the marketing nav wasn't reachable here at all. */}
          {!isAuthenticated && (
            <div className="mobile-header__lang">
              <LanguageSwitcher />
            </div>
          )}
        </div>
      )}

      {/* Desktop: fixed left sidebar for the logged-in app experience */}
      {isAuthenticated ? (
        <nav className="navbar">
          <Link to="/" className="logo navbar__logo">
            <img src="/logo-mark.svg" alt="ToBeATraveller" className="logo__mark" width="26" height="26" />
            <img src="/logo.svg" alt="ToBeATraveller" className="logo__full" height="28" />
          </Link>

          {/* Single create button: opens sheet. First thing under the logo,
              like Gmail's Compose or Notion's New page, since creating a
              trip is this app's central action, not just another nav item. */}
          <button className="nav-create" onClick={openCreate} title={t("nav.createTrip")}>
            <IoAddOutline className="nav-icon" />
            <span>{t("nav.createTrip")}</span>
          </button>

          <div className="nav-section">
            <h3>{t("nav.discover")}</h3>
            <NavLink to="/" className="nav-item" end title={t("nav.home")}>
              <GoHome className="nav-icon" />
              <span>{t("nav.home")}</span>
            </NavLink>
            <NavLink to="/explore" className="nav-item" title={t("nav.explore")}>
              <IoCompassOutline className="nav-icon" />
              <span>{t("nav.explore")}</span>
            </NavLink>
            {/* Was reachable only via Home's "People you may like -> See
                all" link once logged in (the guest marketing nav shows it
                as a top-level item, the authenticated sidebar didn't), so a
                social app's own directory of people had no persistent nav
                entry for the users who'd actually use it day to day. */}
            <NavLink to="/community" className="nav-item" title={t("community.title")}>
              <IoPeopleOutline className="nav-icon" />
              <span>{t("community.title")}</span>
            </NavLink>
          </div>

          <div className="nav-section">
            <h3>{t("nav.yourTools")}</h3>
            {PREMIUM_TOOLS.map(({ to, Icon, labelKey, iconClassName, premiumOnly = true }) => (
              <NavLink key={to} to={to} className="nav-item" title={t(labelKey)}>
                <Icon className={iconClassName ? `nav-icon ${iconClassName}` : "nav-icon"} />
                <span>{t(labelKey)}</span>
                {premiumOnly && !userMe?.isPremium && (
                  <span className="nav-item__premium-badge">{t("admin.premium")}</span>
                )}
              </NavLink>
            ))}
          </div>

          <div className="navbar__bottom">
            <button
              className="navbar__toggle"
              onClick={toggleSidebar}
              title={isCollapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
            >
              {isCollapsed ? <IoChevronForward className="nav-icon" /> : <IoChevronBack className="nav-icon" />}
              <span>{t("nav.collapse")}</span>
            </button>
          </div>
        </nav>
      ) : (
        /* Desktop: horizontal top nav for anonymous, marketing-facing pages.
           On Home it overlays the hero photo (transparent, white logo) and
           becomes a solid bar once scrolled past the hero. */
        <nav
          className={`marketing-navbar${isHomePage ? " marketing-navbar--overlay" : ""}${isTransparentNav ? " marketing-navbar--transparent" : ""}`}
        >
          <div className="marketing-navbar__inner">
            <Link to="/" className="logo marketing-navbar__logo">
              <img
                src={isTransparentNav ? "/logo-white.svg" : "/logo.svg"}
                alt="ToBeATraveller"
                className="logo__full"
                height="34"
              />
            </Link>

            <div className="marketing-navbar__links">
              <NavLink to="/explore" className="marketing-navbar__link">{t("nav.explore")}</NavLink>
              <NavLink to="/community" className="marketing-navbar__link">{t("community.title")}</NavLink>
              <NavLink to="/subscription" className="marketing-navbar__link">{t("nav.subscription")}</NavLink>
            </div>

            <div className="marketing-navbar__auth">
              <LanguageSwitcher />
              <Link to="/login" className="marketing-navbar__login">{t("nav.login")}</Link>
              <Link to="/register" className="btn btn--primary marketing-navbar__register">{t("nav.createAccountBtn")}</Link>
            </div>
          </div>
        </nav>
      )}

      {/* Mobile: bottom tab bar */}
      <nav className="bottom-nav">
        <NavLink to="/" className="bottom-nav__item" end>
          <GoHome className="bottom-nav__icon" />
          <span>{t("nav.home")}</span>
        </NavLink>
        <NavLink to="/explore" className="bottom-nav__item">
          <IoCompassOutline className="bottom-nav__icon" />
          <span>{t("nav.explore")}</span>
        </NavLink>
        {/* The desktop/tablet marketing nav shows this to anonymous visitors
            (see marketing-navbar__links); this bar had no equivalent, so an
            anonymous mobile web visitor had no way to reach the pricing page
            at all short of the URL. */}
        {!isAuthenticated && (
          <NavLink to="/subscription" className="bottom-nav__item">
            <IoCardOutline className="bottom-nav__icon" />
            <span>{t("nav.subscription")}</span>
          </NavLink>
        )}
        {/* Same gap as the desktop sidebar (see the nav-section above):
            logged-in mobile users had no persistent way to reach Community
            either, only a link buried in Home. */}
        {isAuthenticated && (
          <NavLink to="/community" className="bottom-nav__item">
            <IoPeopleOutline className="bottom-nav__icon" />
            <span>{t("community.title")}</span>
          </NavLink>
        )}
        <button type="button" className="bottom-nav__item" onClick={onOpenSearch}>
          <IoSearchOutline className="bottom-nav__icon" />
          <span>{t("globalSearch.trigger")}</span>
        </button>
        {isAuthenticated ? (
          <NavLink to="/account" className="bottom-nav__item">
            {/* Own avatar instead of a generic icon, like Instagram/TikTok/X's
                profile tab, so this slot reads as "yours" at a glance. */}
            <img
              src={optimizedCloudinaryUrl(userMe?.avatarUrl, { width: 48 }) || generateAvatar(userMe?.username)}
              alt=""
              className="bottom-nav__avatar"
            />
            <span>{t("nav.me")}</span>
          </NavLink>
        ) : (
          <NavLink to="/login" className="bottom-nav__item">
            <GoSignIn className="bottom-nav__icon" />
            <span>{t("nav.login")}</span>
          </NavLink>
        )}
      </nav>

      {/* Create sheet */}
      {createOpen && (
        <div className="create-sheet__backdrop" onClick={() => setCreateOpen(false)}>
          <div className="create-sheet" onClick={e => e.stopPropagation()}>
            <div className="create-sheet__handle" />
            <p className="create-sheet__title">{t("nav.createSheetTitle")}</p>

            <button className="create-sheet__option create-sheet__option--itinerary" onClick={() => handleCreate("/create-itinerary")}>
              <div className="create-sheet__option-icon">
                <IoListOutline size={24} />
              </div>
              <div className="create-sheet__option-text">
                <strong>{t("nav.createSheetItinerary")}</strong>
                <span>{t("nav.createSheetItineraryDesc")}</span>
              </div>
              <IoChevronForwardOutline size={16} className="create-sheet__option-arrow" />
            </button>

            <button className="create-sheet__option create-sheet__option--experience" onClick={() => handleCreate("/create-experience")}>
              <div className="create-sheet__option-icon">
                <IoFlashOutline size={24} />
              </div>
              <div className="create-sheet__option-text">
                <strong>{t("nav.createSheetExperience")}</strong>
                <span>{t("nav.createSheetExperienceDesc")}</span>
              </div>
              <IoChevronForwardOutline size={16} className="create-sheet__option-arrow" />
            </button>

            <button className="create-sheet__cancel" onClick={() => setCreateOpen(false)}>
              {t("nav.createSheetCancel")}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
