import {
  IoBookOutline,
  IoBriefcaseOutline,
  IoCardOutline,
  IoCartOutline,
  IoChevronForward,
  IoJournalOutline,
  IoListOutline,
  IoSaveOutline,
  IoSettingsOutline,
  IoSparkles,
} from "react-icons/io5";
import { GoSignOut } from "react-icons/go";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Spinner from "../../components/spinner/Spinner";
import { selectMe } from "../../store/user/userInfoSelectors";
import { generateAvatar } from "../../utils/constants/constants";
import { optimizedCloudinaryUrl } from "../../utils/cloudinaryUrl";
import "./Account.scss";

const Account = () => {
  const { t } = useTranslation();
  const userMe = useSelector(selectMe);

  if (!userMe) return <Spinner />;

  const isPremium = !!userMe.isPremium;

  // This page is the sole destination for the mobile bottom-nav's "Me" tab
  // (no more intermediate quick-menu in between, see Navbar.jsx), so it
  // needs to cover everything: profile-y links plus the premium tools and
  // logout. On screens >=480px those last two groups are hidden (see
  // .account__link-item--mobile-only) because the desktop sidebar already
  // lists the tools and the Topbar's account menu already has logout.
  // Grouped into titled sections (like iOS Settings/Airbnb's account page)
  // rather than one flat list, now that it's grown to 9 rows.
  const sections = [
    {
      // Profile itself isn't repeated here: the header card above already
      // links to it (see the comment on that Link), so listing it again a
      // few rows down would be the exact "same destination twice on one
      // screen" issue this page keeps needing to avoid.
      items: [
        { to: "/my-itineraries", Icon: IoListOutline, label: t("nav.myTrips") },
        { to: "/itineraries/saved", Icon: IoSaveOutline, label: t("nav.savedTrips") },
      ],
    },
    {
      title: t("nav.yourTools"),
      mobileOnly: true,
      items: [
        { to: "/van-log", Icon: IoBookOutline, label: t("nav.vanLog") },
        { to: "/supplies", Icon: IoCartOutline, label: t("nav.supplies") },
        { to: "/packing-checklist", Icon: IoBriefcaseOutline, label: t("nav.packingChecklist"), premium: true },
        { to: "/life-diary", Icon: IoJournalOutline, label: t("nav.lifeDiary") },
      ],
    },
    {
      items: [
        { to: "/settings", Icon: IoSettingsOutline, label: t("settings.title") },
        { to: "/logout", Icon: GoSignOut, label: t("auth.logout"), mobileOnly: true, danger: true },
      ],
    },
  ];

  return (
    <section className="account">
      {/* The card itself is the profile shortcut (Instagram/X/TikTok pattern):
          tapping your own avatar/username is expected to open your profile,
          not just display it. */}
      <Link to={`/profile/${userMe.id}`} className="account__header">
        <img
          src={optimizedCloudinaryUrl(userMe.avatarUrl, { width: 64 }) || generateAvatar(userMe.username)}
          alt={userMe.username}
          className="account__avatar"
        />
        <div>
          <p className="account__username">@{userMe.username}</p>
          {isPremium && <span className="account__premium-badge">{t("admin.premium")}</span>}
        </div>
        <IoChevronForward className="account__header-arrow" aria-hidden="true" />
      </Link>

      {!isPremium && (
        <Link to="/subscription" className="account__upsell">
          <IoSparkles className="account__upsell-icon" aria-hidden="true" />
          <div>
            <p className="account__upsell-title">{t("subscription.title")}</p>
            <p className="account__upsell-desc">{t("subscription.subtitle")}</p>
          </div>
          <IoChevronForward className="account__upsell-arrow" aria-hidden="true" />
        </Link>
      )}
      {isPremium && (
        <Link to="/subscription" className="account__upsell account__upsell--premium">
          <IoCardOutline className="account__upsell-icon" aria-hidden="true" />
          <div>
            <p className="account__upsell-title">{t("subscription.manageLink")}</p>
          </div>
          <IoChevronForward className="account__upsell-arrow" aria-hidden="true" />
        </Link>
      )}

      {sections.map((section, i) => (
        <div
          key={section.title ?? i}
          className={`account__section${section.mobileOnly ? " account__section--mobile-only" : ""}`}
        >
          {section.title && <h3 className="account__section-title">{section.title}</h3>}
          <ul className="account__links">
            {section.items.map(({ to, Icon, label, premium, mobileOnly, danger }) => (
              <li key={to} className={mobileOnly ? "account__link-item--mobile-only" : undefined}>
                <Link to={to} className={`account__link${danger ? " account__link--danger" : ""}`}>
                  <Icon className="account__link-icon" aria-hidden="true" />
                  <span className="account__link-label">{label}</span>
                  {premium && !isPremium && (
                    <span className="account__link-badge">{t("admin.premium")}</span>
                  )}
                  <IoChevronForward className="account__link-arrow" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
};

export default Account;
