import { IoAddOutline, IoBookOutline, IoBriefcaseOutline, IoCartOutline, IoJournalOutline } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { formatAmount } from "@tobeatraveller/shared";
import { useVanToday } from "../../hooks/useVanToday";
import "./VanToday.scss";

// The four tools of the road, within reach of the first screen.
const TOOLS = [
  { to: "/van-log", Icon: IoBookOutline, labelKey: "nav.vanLog" },
  { to: "/supplies", Icon: IoCartOutline, labelKey: "nav.supplies" },
  { to: "/packing-checklist", Icon: IoBriefcaseOutline, labelKey: "nav.packingChecklist" },
  { to: "/life-diary", Icon: IoJournalOutline, labelKey: "nav.lifeDiary" },
];

const LOADING_TEXT = "…";

const VanToday = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { loading, summary } = useVanToday();
  const { monthTotals, shoppingCount } = summary;

  const monthText = loading
    ? LOADING_TEXT
    : monthTotals === null
    ? t("vanToday.unavailable")
    : monthTotals.length === 0
    ? t("vanToday.monthNothing")
    : monthTotals.map(({ currency, total }) => formatAmount(total, currency, i18n.resolvedLanguage)).join(" · ");

  const shoppingText = loading
    ? LOADING_TEXT
    : shoppingCount === null
    ? t("vanToday.unavailable")
    : shoppingCount === 0
    ? t("vanToday.shoppingNothing")
    : t("vanToday.shoppingCount", { count: shoppingCount });

  return (
    <section className="van-today" aria-labelledby="van-today-title">
      <div className="van-today__header">
        <h2 id="van-today-title" className="van-today__title">{t("vanToday.title")}</h2>
        <button type="button" className="btn btn--primary van-today__add" onClick={() => navigate("/van-log", { state: { quickAdd: true } })}>
          <IoAddOutline aria-hidden="true" /> {t("vanToday.addExpense")}
        </button>
      </div>

      <div className="van-today__cards">
        <Link to="/van-log" className="van-today__card">
          <span className="van-today__card-label">{t("vanToday.monthTitle")}</span>
          <strong className="van-today__card-value">{monthText}</strong>
        </Link>
        <Link to="/supplies" className="van-today__card">
          <span className="van-today__card-label">{t("vanToday.shoppingTitle")}</span>
          <strong className="van-today__card-value">{shoppingText}</strong>
        </Link>
      </div>

      <nav className="van-today__tools" aria-label={t("nav.yourTools")}>
        {TOOLS.map(({ to, Icon, labelKey }) => (
          <Link key={to} to={to} className="van-today__tool">
            <Icon aria-hidden="true" />
            <span>{t(labelKey)}</span>
          </Link>
        ))}
      </nav>
    </section>
  );
};

export default VanToday;
