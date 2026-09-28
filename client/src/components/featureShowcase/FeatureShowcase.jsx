import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PREMIUM_FEATURES, toAppLanguage } from "@tobeatraveller/shared";
import "./FeatureShowcase.scss";

// Only the features with an actual app screen to show; "noAds" has no
// screen of its own, so it's left out of this tabbed tour.
const SHOWCASE_FEATURE_IDS = ["aiItineraries", "vanLog", "supplies", "packingChecklist", "lifeDiary"];
const SHOWCASE_FEATURES = SHOWCASE_FEATURE_IDS
  .map((id) => PREMIUM_FEATURES.find((feature) => feature.id === id))
  .filter(Boolean);

// Each feature's phone screenshot (390x845) in each of the app's languages,
// at public/images/showcase/<language>/<id>.webp (e.g. es/vanLog.webp). A
// missing one shows the feature's emoji instead.
const FeatureShowcase = () => {
  const { t, i18n } = useTranslation();
  const [activeId, setActiveId] = useState(SHOWCASE_FEATURES[0].id);
  // The one screenshot that failed to load, so another tab or language
  // still tries its own.
  const [missingImage, setMissingImage] = useState(null);
  const active = SHOWCASE_FEATURES.find((feature) => feature.id === activeId);
  const image = `/images/showcase/${toAppLanguage(i18n.language)}/${active.id}.webp`;

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
            onClick={() => setActiveId(id)}
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
          {missingImage === image ? (
            <div className="feature-showcase__placeholder" aria-hidden="true">{active.emoji}</div>
          ) : (
            <img
              key={image}
              src={image}
              alt={t(active.titleKey)}
              className="feature-showcase__image"
              onError={() => setMissingImage(image)}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
