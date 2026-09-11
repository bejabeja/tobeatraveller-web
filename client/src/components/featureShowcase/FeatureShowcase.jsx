import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PREMIUM_FEATURES } from "@tobeatraveller/shared";
import "./FeatureShowcase.scss";

// Only the features with an actual app screen to show; "noAds" has no
// screen of its own, so it's left out of this tabbed tour.
const SHOWCASE_FEATURE_IDS = ["aiItineraries", "vanLog", "supplies", "packingChecklist", "lifeDiary"];
const SHOWCASE_FEATURES = SHOWCASE_FEATURE_IDS
  .map((id) => PREMIUM_FEATURES.find((feature) => feature.id === id))
  .filter(Boolean);

// Drop each feature's phone screenshot (portrait) at
// public/images/showcase/<id>.png (e.g. images/showcase/vanLog.png) and it
// replaces this emoji placeholder automatically, no code change needed.
const FeatureShowcase = () => {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState(SHOWCASE_FEATURES[0].id);
  const [imageMissing, setImageMissing] = useState(false);
  const active = SHOWCASE_FEATURES.find((feature) => feature.id === activeId);

  const handleTabClick = (id) => {
    setActiveId(id);
    setImageMissing(false);
  };

  return (
    <section className="feature-showcase">
      <p className="feature-showcase__title">{t("home.showcaseTitle")}</p>
      <p className="feature-showcase__subtitle">{t("home.showcaseSubtitle")}</p>

      <div className="feature-showcase__tabs" role="tablist">
        {SHOWCASE_FEATURES.map(({ id, titleKey, emoji }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={id === activeId}
            className={`feature-showcase__tab${id === activeId ? " feature-showcase__tab--active" : ""}`}
            onClick={() => handleTabClick(id)}
          >
            <span aria-hidden="true">{emoji}</span> {t(titleKey)}
          </button>
        ))}
      </div>

      <div className="feature-showcase__active-info">
        <p className="feature-showcase__active-desc">{t(active.descriptionKey)}</p>
      </div>

      <div className="feature-showcase__frame">
        <div className="feature-showcase__frame-notch" aria-hidden="true" />
        <div className="feature-showcase__frame-body">
          {imageMissing ? (
            <div className="feature-showcase__placeholder" aria-hidden="true">{active.emoji}</div>
          ) : (
            <img
              key={active.id}
              src={`/images/showcase/${active.id}.png`}
              alt={t(active.titleKey)}
              className="feature-showcase__image"
              onError={() => setImageMissing(true)}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
