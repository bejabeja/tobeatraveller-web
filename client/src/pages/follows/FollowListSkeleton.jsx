import { useTranslation } from "react-i18next";

const SKELETON_CARDS = 6;

// The list with its real title while the people arrive: the same cards, empty.
const FollowListSkeleton = ({ title }) => {
  const { t } = useTranslation();

  return (
    <section className="follow-list section__container" role="status" aria-busy="true" aria-label={t("common.loading")}>
      <h2 className="follow-list__title">{title}</h2>
      <div className="follow-list__grid">
        {Array.from({ length: SKELETON_CARDS }, (_, i) => (
          <div key={i} className="follow-card follow-card--skeleton">
            <div className="follow-card__link">
              <div className="skeleton follow-card__avatar" />
              <div className="follow-card__info follow-card__info--skeleton">
                <div className="skeleton skeleton--text" />
                <div className="skeleton skeleton--text shorter" />
              </div>
            </div>
            <div className="skeleton follow-card__button-skeleton" />
          </div>
        ))}
      </div>
    </section>
  );
};

export default FollowListSkeleton;
