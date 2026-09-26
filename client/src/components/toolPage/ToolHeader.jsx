import { IoSparkles } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import "./ToolPage.scss";

const PLANS_LINK = "/subscription#subscription-plans";

// The top of every tool page (Expenses, shopping list, diary, packing): its
// title, the free plan's usage and its main action. Once the free limit is
// reached, the action leads to Premium instead of opening a form that could
// only say "limit reached". `children` sits next to the title (the packing
// progress).
const ToolHeader = ({ title, usage, usageLabel, actionLabel, ActionIcon, onAction, children }) => {
  const { t } = useTranslation();
  const atFreeLimit = !!usage?.limited && usage.used >= usage.limit;

  return (
    <div className="tool-header">
      <div className="tool-header__titles">
        <h1 className="tool-header__title">{title}</h1>
        {usage?.limited && (
          <Link to={PLANS_LINK} className={`tool-header__usage${atFreeLimit ? " tool-header__usage--full" : ""}`}>
            {usageLabel}
          </Link>
        )}
        {children}
      </div>
      {atFreeLimit ? (
        <Link to={PLANS_LINK} className="btn btn--primary tool-header__action">
          <IoSparkles aria-hidden="true" /> {t("tools.unlockMore")}
        </Link>
      ) : onAction && (
        <button type="button" className="btn btn--primary tool-header__action" onClick={onAction}>
          {ActionIcon && <ActionIcon aria-hidden="true" />} {actionLabel}
        </button>
      )}
    </div>
  );
};

export default ToolHeader;
