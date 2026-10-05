import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { summarizePassport } from "@tobeatraveller/shared";
import { useUserPassport } from "../../hooks/useUserPassport";
import "./PassportSummary.scss";

const NO_FLAGS = 0;

// Where their passport stands, for someone who does not live in a van (they
// have their own panel). Not for someone with nothing in it yet: "no countries"
// is no news, and the Home is for what is there.
const PassportSummary = ({ userId }) => {
  const { t } = useTranslation();
  const { passport } = useUserPassport(userId);
  const summary = summarizePassport(passport, NO_FLAGS);

  if (!summary || (summary.countryCount === 0 && summary.earnedCount === 0)) return null;

  return (
    <div className="passport-summary">
      <Link to={`/profile/${userId}/passport`} className="passport-summary__card">
        <span className="passport-summary__label">🛂 {t("passport.title")}</span>
        <strong className="passport-summary__value">{t("passport.countriesCount", { count: summary.countryCount })}</strong>
        <span className="passport-summary__hint">{t("passport.collected", { earned: summary.earnedCount, total: summary.totalCount })}</span>
      </Link>
    </div>
  );
};

export default PassportSummary;
