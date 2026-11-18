import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { countryFlag, countryName } from "@tobeatraveller/shared";
import FeatureLoadState from "../../components/featureLoadState/FeatureLoadState";
import Spinner from "../../components/spinner/Spinner";
import { getSignupBreakdown } from "../../services/users";
import "./InternalSignups.scss";

const BreakdownTable = ({ title, rows, recentDays, labelOf }) => {
  const { t } = useTranslation();

  return (
    <section className="internal-signups__section">
      <h2 className="internal-signups__section-title">{title}</h2>
      <table className="internal-signups__table">
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col">{t("admin.signupsTotal")}</th>
            <th scope="col">{t("admin.signupsRecent", { count: recentDays })}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{labelOf(row)}</th>
              <td>{row.total}</td>
              <td>{row.recent}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

const InternalSignups = () => {
  const { t, i18n } = useTranslation();
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    getSignupBreakdown()
      .then((data) => { setBreakdown(data); setError(null); })
      .catch(() => setError("error"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (error) return <FeatureLoadState status={error} onRetry={load} />;
  if (loading) return <Spinner />;

  const countryLabel = ({ countryCode }) => (countryCode
    ? `${countryFlag(countryCode)} ${countryName(countryCode, i18n.language)}`
    : t("admin.signupsUnknownCountry"));

  return (
    <div className="internal-signups">
      <p className="internal-signups__intro">{t("admin.signupsIntro")}</p>
      <BreakdownTable
        title={t("admin.signupsByCountry")}
        rows={breakdown.countries.map((row) => ({ ...row, key: row.countryCode ?? "unknown" }))}
        recentDays={breakdown.recentDays}
        labelOf={countryLabel}
      />
      <BreakdownTable
        title={t("admin.signupsByDevice")}
        rows={breakdown.devices.map((row) => ({ ...row, key: row.device }))}
        recentDays={breakdown.recentDays}
        labelOf={({ device }) => t(`admin.signupDevices.${device}`)}
      />
    </div>
  );
};

export default InternalSignups;
