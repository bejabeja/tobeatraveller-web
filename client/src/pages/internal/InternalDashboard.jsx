import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./InternalDashboard.scss";

const InternalDashboard = () => {
  const { t } = useTranslation();

  return (
    <div className="internal-dashboard">
      <header className="internal-dashboard__header">
        <h1 className="internal-dashboard__title">{t("admin.dashboardTitle")}</h1>
        <nav className="internal-dashboard__tabs">
          <NavLink to="/internal/users" className="internal-dashboard__tab">
            {t("admin.usersTitle")}
          </NavLink>
          <NavLink to="/internal/audit-log" className="internal-dashboard__tab">
            {t("admin.auditLogTitle")}
          </NavLink>
          <NavLink to="/internal/referrals" className="internal-dashboard__tab">
            {t("admin.referralsTitle")}
          </NavLink>
        </nav>
      </header>
      <div className="internal-dashboard__content">
        <Outlet />
      </div>
    </div>
  );
};

export default InternalDashboard;
