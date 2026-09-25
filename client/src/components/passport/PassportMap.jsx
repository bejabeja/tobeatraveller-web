import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MAP_COUNTRY_STATES, passportMap } from "@tobeatraveller/shared";
import "./PassportMap.scss";

const DOT_RADIUS = 3;
const LEGEND = [
  { state: MAP_COUNTRY_STATES.VISITED, labelKey: "passport.mapVisited" },
  { state: MAP_COUNTRY_STATES.PRIVATE, labelKey: "passport.mapPrivate" },
  { state: MAP_COUNTRY_STATES.DECLARED, labelKey: "passport.mapDeclared" },
];

// The world with the passport's countries painted in. The list of country
// stamps below says the same in text, so for screen readers the map is a
// single image with how many are painted.
const PassportMap = ({ passport }) => {
  const { t } = useTranslation();
  const map = useMemo(() => passportMap(passport), [passport]);
  const painted = map.countries.filter(country => country.state);
  const states = new Set(painted.map(country => country.state));

  return (
    <figure className="passport-map">
      <svg
        className="passport-map__svg"
        viewBox={`0 0 ${map.width} ${map.height}`}
        role="img"
        aria-label={t("passport.mapLabel", { count: painted.length })}
      >
        {map.countries.map(({ code, d, state }) => d && (
          <path key={code} d={d} data-country={code} className={`passport-map__country${state ? ` passport-map__country--${state}` : ""}`} />
        ))}
        {painted.filter(country => country.dot).map(({ code, dot, state }) => (
          <circle key={`${code}-dot`} cx={dot[0]} cy={dot[1]} r={DOT_RADIUS} data-country={code} className={`passport-map__dot passport-map__dot--${state}`} />
        ))}
      </svg>
      {states.size > 0 && (
        <figcaption className="passport-map__legend">
          {LEGEND.filter(({ state }) => states.has(state)).map(({ state, labelKey }) => (
            <span key={state} className="passport-map__legend-item">
              <span className={`passport-map__swatch passport-map__swatch--${state}`} aria-hidden="true" />
              {t(labelKey)}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
};

// Hundreds of outlines: redrawn only when the passport changes, not on
// every change elsewhere on the screen (opening a sheet, a dialog...).
export default memo(PassportMap);
