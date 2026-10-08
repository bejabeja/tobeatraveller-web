import { useTranslation } from "react-i18next";
import "./PageSkeleton.scss";

// What shows while a page's code arrives. Deliberately plain (a title, a line
// and a few blocks): it stands in for any page, so a shape of one in particular
// would jump when another one loads.
const PageSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div className="page-skeleton section__container" role="status" aria-busy="true" aria-label={t("common.loading")}>
      <div className="skeleton page-skeleton__title" />
      <div className="skeleton page-skeleton__line" />
      <div className="page-skeleton__blocks">
        <div className="skeleton page-skeleton__block" />
        <div className="skeleton page-skeleton__block" />
        <div className="skeleton page-skeleton__block" />
      </div>
    </div>
  );
};

export default PageSkeleton;
